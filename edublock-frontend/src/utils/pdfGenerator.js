import jsPDF from 'jspdf';

/**
 * Generate and Download PDF Certificate
 * Creates a professional certificate PDF with proper filename
 * 
 * @param {Object} certificateData - Certificate details
 * @returns {void} - Triggers PDF download
 */
export const generateCertificatePDF = (certificateData) => {
    // Validate input
    if (!certificateData) {
        console.error('No certificate data provided');
        return;
    }

    const {
        studentName = 'Student',
        courseName = 'Certificate',
        institution = 'Educational Institution',
        grade = 'N/A',
        issueDate = new Date().toISOString().split('T')[0],
        hash = '',
        txHash = '',
        status = 'Issued',
    } = certificateData;

    try {
        // Create new PDF document (A4 Landscape)
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // === HEADER SECTION ===
        // Blue header bar
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Institution name
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(institution, pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Blockchain Verified Certificate', pageWidth / 2, 30, { align: 'center' });

        // === CERTIFICATE TITLE ===
        doc.setFontSize(32);
        doc.setTextColor(59, 130, 246);
        doc.setFont('helvetica', 'bold');
        doc.text('CERTIFICATE', pageWidth / 2, 60, { align: 'center' });

        doc.setFontSize(16);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('OF COMPLETION', pageWidth / 2, 70, { align: 'center' });

        // === DECORATIVE LINE ===
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(60, 75, pageWidth - 60, 75);

        // === CERTIFICATE BODY ===
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'normal');
        doc.text('This is to certify that', pageWidth / 2, 90, { align: 'center' });

        // Student name (highlighted)
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(studentName, pageWidth / 2, 105, { align: 'center' });

        // Achievement text
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text('has successfully completed', pageWidth / 2, 118, { align: 'center' });

        // Course name
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text(courseName, pageWidth / 2, 130, { align: 'center' });

        // === DETAILS SECTION ===
        const detailsY = 145;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70, 70, 70);

        // Grade
        doc.text(`Grade: ${grade}`, 80, detailsY);

        // Issue date - format nicely
        let formattedDate = issueDate;
        try {
            formattedDate = new Date(issueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            // Keep original if parsing fails
        }
        doc.text(`Issue Date: ${formattedDate}`, 180, detailsY);

        // Status badge
        const statusColor = status === 'Issued' ? [34, 197, 94] : [234, 179, 8];
        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.roundedRect(pageWidth - 65, detailsY - 5, 30, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(status, pageWidth - 50, detailsY, { align: 'center' });

        // === BLOCKCHAIN VERIFICATION SECTION ===
        const verificationY = 165;

        doc.setFontSize(12);
        doc.setTextColor(59, 130, 246);
        doc.setFont('helvetica', 'bold');
        doc.text('Blockchain Verification', pageWidth / 2, verificationY, { align: 'center' });

        // Certificate hash
        if (hash) {
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont('courier', 'normal');
            const displayHash = hash.length > 40 ? `${hash.slice(0, 20)}...${hash.slice(-15)}` : hash;
            doc.text(`Certificate Hash: ${displayHash}`, pageWidth / 2, verificationY + 7, { align: 'center' });
        }

        // Transaction hash
        if (txHash) {
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont('courier', 'normal');
            const displayTxHash = txHash.length > 40 ? `${txHash.slice(0, 20)}...${txHash.slice(-15)}` : txHash;
            doc.text(`Transaction Hash: ${displayTxHash}`, pageWidth / 2, verificationY + 13, { align: 'center' });
        }

        // Verification URL
        doc.setFontSize(9);
        doc.setTextColor(59, 130, 246);
        doc.setFont('helvetica', 'normal');
        const verifyUrl = hash ? `${window.location.origin}/verify?hash=${hash}` : `${window.location.origin}/verify`;
        doc.text(`Verify at: ${verifyUrl}`, pageWidth / 2, verificationY + 20, { align: 'center' });

        // === FOOTER ===
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text('This certificate is secured on the blockchain and can be verified using the hash above.',
            pageWidth / 2, pageHeight - 15, { align: 'center' });

        doc.setFontSize(7);
        doc.text('© EduBlock - Blockchain Based Degree Verification System',
            pageWidth / 2, pageHeight - 10, { align: 'center' });

        // === GENERATE FILENAME AND DOWNLOAD ===
        // Clean the names for filename
        const cleanName = (str) => {
            return str
                .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
                .replace(/\s+/g, '_')           // Replace spaces with underscores
                .substring(0, 30);              // Limit length
        };

        const safeStudentName = cleanName(studentName) || 'Student';
        const safeCourseName = cleanName(courseName) || 'Certificate';
        const fileName = `${safeStudentName}_${safeCourseName}_Certificate.pdf`;

        // Download the PDF
        doc.save(fileName);

        console.log(`PDF downloaded: ${fileName}`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    }
};

/**
 * Simple PDF download with minimal data
 * Fallback for quick downloads
 */
export const downloadSimplePDF = (studentName, courseName) => {
    generateCertificatePDF({
        studentName: studentName || 'Student',
        courseName: courseName || 'Certificate'
    });
};

export default { generateCertificatePDF, downloadSimplePDF };
