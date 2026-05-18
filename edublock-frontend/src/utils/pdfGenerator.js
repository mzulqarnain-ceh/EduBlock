import jsPDF from 'jspdf';
import QRCode from 'qrcode';

/**
 * Generate and Download PDF Certificate
 * Creates a highly professional, modern, and minimalist corporate certificate PDF.
 * Strips out the redundant plain-text localhost URL (the QR code alone acts as the verification scanner).
 * 
 * @param {Object} certificateData - Certificate details
 * @returns {Promise<void>} - Triggers PDF download
 */
export const generateCertificatePDF = async (certificateData) => {
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
        // Create new A4 Landscape PDF
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. Pristine Pure White Background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // 2. High-End Top Header Ribbon (Solid Charcoal & Metallic Gold)
        doc.setFillColor(15, 23, 42); // Charcoal Slate 900
        doc.rect(0, 0, pageWidth, 6, 'F');
        
        doc.setFillColor(212, 175, 55); // Golden rod Accent
        doc.rect(0, 6, pageWidth, 1.5, 'F');

        // 3. Elegant Circular University Seal Emblem (Top Center)
        const sealX = pageWidth / 2;
        const sealY = 24;
        
        // Outer golden circle ring
        doc.setDrawColor(212, 175, 55); // Gold
        doc.setLineWidth(0.6);
        doc.circle(sealX, sealY, 10, 'D');

        // Inner solid royal blue fill
        doc.setFillColor(37, 99, 235); // Royal Blue
        doc.circle(sealX, sealY, 8.8, 'F');
        
        // Text inside the top badge
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.text('EDUBLOCK', sealX, sealY - 1.2, { align: 'center' });
        doc.text('AUTHENTIC', sealX, sealY + 1.6, { align: 'center' });
        
        doc.setTextColor(212, 175, 55);
        doc.setFontSize(4.5);
        doc.text('SECURED', sealX, sealY + 4.8, { align: 'center' });

        const crestY = 22; // Kept as anchor for text Y spacing

        // Helper to capitalize words perfectly into Title Case
        const formatTitleCase = (str) => {
            if (!str) return '';
            return str
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        };

        // 4. Institution Header (Letter-Spaced Corporate Styling - Darker Slate 700 for high visibility)
        const cleanInstitution = institution.toUpperCase();
        const spacedInstitution = cleanInstitution.split('').join(' ');
        doc.setFontSize(10.5);
        doc.setTextColor(51, 65, 85); // Slate 700
        doc.setFont('helvetica', 'bold');
        doc.text(spacedInstitution, pageWidth / 2, crestY + 20, { align: 'center' });

        // 5. Main Certificate Title
        doc.setFontSize(26);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, crestY + 34, { align: 'center' });

        // 6. Presentation Line (Darker Slate 500 for enhanced visibility)
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.setFont('helvetica', 'normal');
        doc.text('THIS IS PROUDLY PRESENTED TO', pageWidth / 2, crestY + 42, { align: 'center' });

        // 7. Capitalized Student Name
        const cleanStudentName = formatTitleCase(studentName);
        doc.setFontSize(24);
        doc.setTextColor(31, 41, 55); // Rich Slate 800
        doc.setFont('helvetica', 'bold');
        doc.text(cleanStudentName, pageWidth / 2, crestY + 54, { align: 'center' });

        // Thin Calligraphy Gold Separator Line
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - 40, crestY + 58, pageWidth / 2 + 40, crestY + 58);

        // 8. Course Description (Darker Slate 500 for high contrast/visibility)
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.setFont('helvetica', 'normal');
        doc.text('FOR SUCCESSFUL COMPLETION OF ALL SPECIFIED REQUIREMENTS FOR THE DEGREE OF', pageWidth / 2, crestY + 66, { align: 'center' });

        const cleanCourseName = formatTitleCase(courseName);
        doc.setFontSize(17);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(cleanCourseName, pageWidth / 2, crestY + 76, { align: 'center' });

        // 9. Completion Grade Details (Darker Slate 700 for visibility)
        let formattedDate = issueDate;
        try {
            formattedDate = new Date(issueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            // Keep default
        }
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85); // Slate 700
        doc.text(`Completed with an overall grade of ${grade} on ${formattedDate}`, pageWidth / 2, crestY + 84, { align: 'center' });

        // 10. Split Footer Panel (QR Code Column | Credential Metadata Center | VC Signature Column)
        const panelY = 124;

        // --- LEFT COLUMN: QR Code (Only QR code with clean border, NO raw localhost URL string) ---
        const qrX = 35;
        const verifyUrl = hash ? `${window.location.origin}/verify?hash=${hash}` : `${window.location.origin}/verify`;
        let qrDataUrl = '';
        try {
            qrDataUrl = await QRCode.toDataURL(verifyUrl, {
                margin: 0,
                width: 150,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                }
            });

            // Draw QR Code
            doc.addImage(qrDataUrl, 'PNG', qrX, panelY, 28, 28);

            // Clean Slate Outer Border around QR Code
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.rect(qrX - 2, panelY - 2, 32, 32);

            // Label under QR Code (No long URL - Darker Slate 500 for legibility)
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139); // Slate 500
            doc.setFont('helvetica', 'bold');
            doc.text('VERIFY CREDENTIAL', qrX + 14, panelY + 36, { align: 'center' });

        } catch (qrErr) {
            console.error('Failed to render QR Code inside PDF:', qrErr);
        }

        // --- CENTER COLUMN: Academic & Blockchain Records (Centered column layout) ---
        const metaX = pageWidth / 2;
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.setFont('helvetica', 'bold');
        doc.text('CREDENTIAL METADATA', metaX, panelY + 3, { align: 'center' });

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(metaX - 35, panelY + 6, metaX + 35, panelY + 6);

        // Data fields
        doc.setFontSize(8.5);
        
        // Grade
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text('Grade Achieved:', metaX - 30, panelY + 11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(grade, metaX + 30, panelY + 11, { align: 'right' });

        // Date
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Date of Issue:', metaX - 30, panelY + 16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(formattedDate, metaX + 30, panelY + 16, { align: 'right' });

        // Status
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Status:', metaX - 30, panelY + 21);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94); // Green status
        doc.text(status.toUpperCase(), metaX + 30, panelY + 21, { align: 'right' });

        // --- RIGHT COLUMN: Vice Chancellor Calligraphy Signature ---
        const sigX = pageWidth - 65;
        
        // Cursive authority signature in dark charcoal ink
        doc.setFont('times', 'italic');
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text('Dr. Harrison Tech', sigX + 15, panelY + 14, { align: 'center' });

        // Signature separator line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(sigX - 10, panelY + 20, sigX + 40, panelY + 20);

        // Signatory Title and Details (Darker Slate 500 for labels)
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Vice Chancellor', sigX + 15, panelY + 25, { align: 'center' });
        
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Authorized Signatory', sigX + 15, panelY + 29, { align: 'center' });

        // 11. Minimalist Blockchain Hash Footer (Darker Slate 600/500 for enhanced visibility)
        const footerY = 186;
        
        doc.setFont('courier', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105); // Slate 600
        const displayHash = hash ? (hash.length > 40 ? `${hash.slice(0, 20)}...${hash.slice(-20)}` : hash) : 'N/A';
        doc.text(`BLOCKCHAIN RECORD HASH: ${displayHash}`, pageWidth / 2, footerY, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text('This registry certificate is cryptographically secured on the decentralized blockchain.', pageWidth / 2, footerY + 5, { align: 'center' });
        doc.text('EDUBLOCK VERIFICATION NETWORK', pageWidth / 2, footerY + 9, { align: 'center' });

        // 12. Safe File Name for Download
        const cleanFilename = (str) => {
            return str
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .substring(0, 30);
        };

        const safeStudentName = cleanFilename(studentName) || 'Student';
        const safeCourseName = cleanFilename(cleanCourseName) || 'Certificate';
        const fileName = `${safeStudentName}_${safeCourseName}_Certificate.pdf`;

        // Trigger Download
        doc.save(fileName);
        console.log(`Corporate Minimalist PDF successfully downloaded: ${fileName}`);

    } catch (error) {
        console.error('Error generating corporate PDF:', error);
        alert('Failed to generate professional PDF. Please try again.');
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
