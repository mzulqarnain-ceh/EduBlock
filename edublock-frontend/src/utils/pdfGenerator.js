import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

/**
 * Generate and Download PDF Certificate
 * Creates a highly professional pure-CSS certificate with NO background image.
 * Navy border, gold corners, circular emblem, calligraphic student name,
 * QR code card, metadata card, signature + seal, blockchain footer.
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
        // Generate QR code Data-URL first
        const verifyUrl = hash
            ? `${window.location.origin}/verify?hash=${hash}`
            : `${window.location.origin}/verify`;
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
            margin: 0,
            width: 150,
            color: {
                dark: '#0f172a',
                light: '#ffffff',
            },
        });

        let formattedDate = issueDate;
        try {
            formattedDate = new Date(issueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (e) {
            // Keep default
        }

        const formatTitleCase = (str) => {
            if (!str) return '';
            return str
                .toLowerCase()
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        };

        // Letter-space each word, separate words with wider gap
        const spacedInstitution = institution.toUpperCase().split(' ').map(w => w.split('').join('\u2005')).join('\u2003\u2003');
        const cleanStudentName = formatTitleCase(studentName);
        const cleanCourseName = formatTitleCase(courseName);
        const displayHash = hash
            ? hash.length > 40
                ? `${hash.slice(0, 20)}...${hash.slice(-20)}`
                : hash
            : 'N/A';

        // ── Off-screen container ──────────────────────────────────────────────────
        const container = document.createElement('div');
        container.style.cssText = [
            'position:absolute',
            'left:-9999px',
            'top:-9999px',
            'width:1123px',
            'height:794px',
            'background-color:#f8f7f2',
        ].join(';');

        // ── Pure CSS / HTML certificate ───────────────────────────────────────────
        container.innerHTML = `
<div style="
    position:relative;
    width:1123px;
    height:794px;
    box-sizing:border-box;
    background-color:#f8f7f2;
    overflow:hidden;
    font-family:Arial,sans-serif;
    color:#0f172a;
    border:14px solid #0f2d66;
">

    <!-- Gold inner outline -->
    <div style="
        position:absolute;top:8px;left:8px;right:8px;bottom:8px;
        border:2px solid #d4af37;
        pointer-events:none;z-index:10;
    "></div>

    <!-- Watermark circle -->
    <div style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:400px;height:400px;border-radius:50%;
        background:radial-gradient(circle,rgba(212,175,55,0.07) 0%,transparent 70%);
        border:2px solid rgba(212,175,55,0.09);
        z-index:0;pointer-events:none;
    "></div>

    <!-- Corner TL -->
    <div style="position:absolute;top:16px;left:16px;z-index:11;pointer-events:none;">
        <div style="position:absolute;top:0;left:0;width:90px;height:3px;background:#d4af37;"></div>
        <div style="position:absolute;top:0;left:0;width:3px;height:90px;background:#d4af37;"></div>
        <div style="position:absolute;top:12px;left:12px;width:60px;height:1.5px;background:#d4af37;opacity:.5;"></div>
        <div style="position:absolute;top:12px;left:12px;width:1.5px;height:60px;background:#d4af37;opacity:.5;"></div>
    </div>
    <!-- Corner TR -->
    <div style="position:absolute;top:16px;right:16px;z-index:11;pointer-events:none;">
        <div style="position:absolute;top:0;right:0;width:90px;height:3px;background:#d4af37;"></div>
        <div style="position:absolute;top:0;right:0;width:3px;height:90px;background:#d4af37;"></div>
        <div style="position:absolute;top:12px;right:12px;width:60px;height:1.5px;background:#d4af37;opacity:.5;"></div>
        <div style="position:absolute;top:12px;right:12px;width:1.5px;height:60px;background:#d4af37;opacity:.5;"></div>
    </div>
    <!-- Corner BL -->
    <div style="position:absolute;bottom:16px;left:16px;z-index:11;pointer-events:none;">
        <div style="position:absolute;bottom:0;left:0;width:90px;height:3px;background:#d4af37;"></div>
        <div style="position:absolute;bottom:0;left:0;width:3px;height:90px;background:#d4af37;"></div>
        <div style="position:absolute;bottom:12px;left:12px;width:60px;height:1.5px;background:#d4af37;opacity:.5;"></div>
        <div style="position:absolute;bottom:12px;left:12px;width:1.5px;height:60px;background:#d4af37;opacity:.5;"></div>
    </div>
    <!-- Corner BR -->
    <div style="position:absolute;bottom:16px;right:16px;z-index:11;pointer-events:none;">
        <div style="position:absolute;bottom:0;right:0;width:90px;height:3px;background:#d4af37;"></div>
        <div style="position:absolute;bottom:0;right:0;width:3px;height:90px;background:#d4af37;"></div>
        <div style="position:absolute;bottom:12px;right:12px;width:60px;height:1.5px;background:#d4af37;opacity:.5;"></div>
        <div style="position:absolute;bottom:12px;right:12px;width:1.5px;height:60px;background:#d4af37;opacity:.5;"></div>
    </div>

    <!-- ═══════════ MAIN CONTENT ═══════════ -->
    <div style="
        position:relative;z-index:5;
        padding:28px 70px 16px;
        height:100%;box-sizing:border-box;
        display:flex;flex-direction:column;align-items:center;
    ">

        <!-- TOP EMBLEM ROW -->
        <div style="display:flex;align-items:center;gap:0;margin-bottom:6px;width:600px;">
            <div style="flex:1;height:1.5px;background:linear-gradient(to right,transparent,#d4af37);"></div>
            <div style="width:10px;height:10px;background:#d4af37;transform:rotate(45deg);margin:0 10px;flex-shrink:0;"></div>
            <!-- Circular navy emblem -->
            <div style="
                width:76px;height:76px;border-radius:50%;
                background:#0f2d66;border:3px solid #d4af37;
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 4px 18px rgba(15,45,102,.45);
                flex-shrink:0;
            ">
                <div style="text-align:center;color:#fff;font-size:8.5px;font-weight:bold;line-height:1.6;letter-spacing:.5px;font-family:Arial,sans-serif;">
                    EDUBLOCK<br>&#9733; AUTHENTIC &#9733;<br>SECURED
                </div>
            </div>
            <div style="width:10px;height:10px;background:#d4af37;transform:rotate(45deg);margin:0 10px;flex-shrink:0;"></div>
            <div style="flex:1;height:1.5px;background:linear-gradient(to left,transparent,#d4af37);"></div>
        </div>

        <!-- Three dots below emblem -->
        <div style="display:flex;gap:5px;margin-bottom:8px;">
            <div style="width:4px;height:4px;border-radius:50%;background:#d4af37;"></div>
            <div style="width:4px;height:4px;border-radius:50%;background:#d4af37;opacity:.5;"></div>
            <div style="width:4px;height:4px;border-radius:50%;background:#d4af37;"></div>
        </div>

        <!-- UNIVERSITY NAME -->
        <div style="
            font-size:12.5px;font-weight:bold;
            letter-spacing:7px;color:#0f2d66;
            text-transform:uppercase;margin-bottom:8px;
            font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
            text-align:center;
        ">${spacedInstitution}</div>

        <!-- CERTIFICATE TITLE -->
        <div style="
            font-size:40px;font-weight:bold;color:#0f2d66;
            font-family:Georgia,'Times New Roman',Times,serif;
            letter-spacing:2px;line-height:1.1;margin-bottom:8px;
            text-align:center;
        ">CERTIFICATE OF COMPLETION</div>

        <!-- Gold separator -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;width:400px;">
            <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#d4af37);"></div>
            <div style="font-size:15px;color:#d4af37;">&#10022;</div>
            <div style="width:22px;height:1.5px;background:#d4af37;"></div>
            <div style="font-size:15px;color:#d4af37;">&#10022;</div>
            <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#d4af37);"></div>
        </div>

        <!-- PRESENTATION LINE -->
        <div style="
            font-size:11px;letter-spacing:3.5px;
            color:#475569;text-transform:uppercase;
            margin-bottom:6px;text-align:center;
            font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
        ">THIS IS PROUDLY PRESENTED TO</div>

        <!-- STUDENT NAME -->
        <div style="
            font-size:54px;font-style:italic;font-weight:bold;
            color:#0f2d66;
            font-family:Georgia,'Times New Roman',serif;
            line-height:1.15;margin-bottom:10px;
            text-align:center;letter-spacing:1px;
        ">${cleanStudentName}</div>

        <!-- Gold underline under name -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;width:360px;">
            <div style="flex:1;height:1.5px;background:linear-gradient(to right,transparent,#d4af37);"></div>
            <div style="width:6px;height:6px;background:#d4af37;transform:rotate(45deg);"></div>
            <div style="flex:1;height:1.5px;background:linear-gradient(to left,transparent,#d4af37);"></div>
        </div>

        <!-- COMPLETION TEXT -->
        <div style="
            font-size:10.5px;color:#64748b;
            text-transform:uppercase;letter-spacing:1.5px;
            margin-bottom:4px;text-align:center;
            font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
        ">FOR SUCCESSFUL COMPLETION OF ALL SPECIFIED REQUIREMENTS FOR THE DEGREE OF</div>

        <!-- DEGREE NAME -->
        <div style="
            font-size:26px;font-weight:bold;color:#0f172a;
            font-family:Georgia,'Times New Roman',Times,serif;
            margin-bottom:6px;text-align:center;
        ">${cleanCourseName}</div>

        <!-- Dot trio -->
        <div style="display:flex;gap:7px;margin-bottom:6px;">
            <div style="width:5px;height:5px;border-radius:50%;background:#d4af37;"></div>
            <div style="width:5px;height:5px;border-radius:50%;background:#d4af37;opacity:.5;"></div>
            <div style="width:5px;height:5px;border-radius:50%;background:#d4af37;"></div>
        </div>

        <!-- GRADE & DATE -->
        <div style="
            font-size:13.5px;color:#475569;
            font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
            margin-bottom:14px;text-align:center;
        ">
            Completed with an overall grade of
            <strong style="color:#0f172a;font-weight:700;">${grade}</strong>
            on
            <strong style="color:#0f172a;font-weight:700;">${formattedDate}</strong>
        </div>

        <!-- ───── BOTTOM 3-COLUMN ───── -->
        <div style="
            display:flex;justify-content:space-between;
            align-items:flex-start;width:100%;gap:14px;
            margin-top:auto;
        ">

            <!-- LEFT: QR Code card -->
            <div style="
                padding:12px 10px;
                border:2px solid #d4af37;
                border-radius:12px;
                text-align:center;
                background:#fff;
                box-shadow:0 4px 12px rgba(0,0,0,.08);
                min-width:130px;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                gap:10px;
            ">
                <img src="${qrDataUrl}" style="width:92px;height:92px;display:block;" />
                <div style="
                    background:#0f2d66;color:#fff;
                    padding:6px 14px;
                    border-radius:20px;
                    font-size:8.5px;font-weight:bold;
                    letter-spacing:.8px;
                    font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                    white-space:nowrap;
                ">VERIFY CREDENTIAL</div>
            </div>

            <!-- CENTER: Metadata card -->
            <div style="
                flex:1;padding:14px 20px;
                background:rgba(255,255,255,.92);
                border-radius:12px;border:1.5px solid #e2e8f0;
                box-shadow:0 4px 12px rgba(0,0,0,.06);
            ">
                <div style="
                    text-align:center;font-weight:bold;font-size:10px;
                    color:#0f2d66;letter-spacing:2px;margin-bottom:10px;
                    border-bottom:1px solid #e2e8f0;padding-bottom:7px;
                    font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                ">CREDENTIAL METADATA</div>
                <table style="width:100%;font-size:12px;border-collapse:collapse;color:#475569;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                    <tr>
                        <td style="padding:4px 0;">&#127891; Grade Achieved:</td>
                        <td style="text-align:right;font-weight:700;color:#0f172a;padding:4px 0;">${grade}</td>
                    </tr>
                    <tr>
                        <td style="padding:4px 0;">&#128197; Date of Issue:</td>
                        <td style="text-align:right;font-weight:700;color:#0f172a;padding:4px 0;">${formattedDate}</td>
                    </tr>
                    <tr>
                        <td style="padding:4px 0;">&#9989; Status:</td>
                        <td style="text-align:right;font-weight:700;color:#16a34a;padding:4px 0;">${status.toUpperCase()}</td>
                    </tr>
                </table>
            </div>

            <!-- RIGHT: Signature + Seal -->
            <div style="
                text-align:center;
                min-width:190px;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
            ">
                <!-- Cursive signature text -->
                <div style="
                    font-size:28px;font-style:italic;font-weight:600;
                    color:#0f2d66;
                    font-family:Georgia,'Times New Roman',serif;
                    line-height:1.3;
                    padding-bottom:6px;
                    border-bottom:2px solid #475569;
                    width:100%;
                    text-align:center;
                    margin-bottom:6px;
                ">Dr. Harrison Tech</div>
                <div style="font-weight:bold;font-size:13px;color:#0f172a;margin-bottom:2px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Vice Chancellor</div>
                <div style="font-size:10px;color:#64748b;margin-bottom:12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Authorized Signatory</div>
                <!-- Seal circle - pure CSS -->
                <div style="
                    width:72px;height:72px;border-radius:50%;
                    border:3px solid #0f2d66;
                    outline:1.5px solid #d4af37;
                    outline-offset:-7px;
                    display:flex;flex-direction:column;
                    align-items:center;justify-content:center;
                    background:rgba(15,45,102,.04);
                ">
                    <div style="margin-bottom:2px;">
                        <div style="width:28px;height:3px;background:#0f2d66;margin:0 auto;"></div>
                        <div style="display:flex;gap:3px;margin:2px auto;width:24px;justify-content:center;">
                            <div style="width:4px;height:11px;background:#0f2d66;"></div>
                            <div style="width:4px;height:11px;background:#0f2d66;"></div>
                            <div style="width:4px;height:11px;background:#0f2d66;"></div>
                        </div>
                        <div style="width:28px;height:2px;background:#0f2d66;margin:0 auto;"></div>
                    </div>
                    <div style="font-size:6px;font-weight:bold;color:#0f2d66;letter-spacing:.5px;text-align:center;line-height:1.3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;margin-top:2px;">
                        OFFICIAL<br>SEAL
                    </div>
                </div>
            </div>

        </div>

        <!-- FOOTER: Blockchain hash -->
        <div style="
            margin-top:10px;text-align:center;
            border-top:1px solid rgba(212,175,55,.35);
            padding-top:7px;width:100%;
        ">
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:4px;">
                <div style="font-size:12px;color:#d4af37;">&#10148;</div>
                <div style="
                    font-size:10px;font-weight:bold;color:#64748b;
                    font-family:'Courier New',Courier,monospace;letter-spacing:.4px;
                ">BLOCKCHAIN RECORD HASH: ${displayHash}</div>
                <div style="font-size:12px;color:#d4af37;">&#10148;</div>
            </div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                This registry certificate is cryptographically secured on the decentralized blockchain.
            </div>
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
                <div style="font-size:9px;color:#d4af37;">&#9670;</div>
                <div style="font-size:10px;font-weight:bold;color:#0f2d66;letter-spacing:2px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">EDUBLOCK VERIFICATION NETWORK</div>
                <div style="font-size:9px;color:#d4af37;">&#9670;</div>
            </div>
        </div>

    </div>
</div>
        `;

        document.body.appendChild(container);

        // Wait for QR code image to paint
        await new Promise((resolve) => setTimeout(resolve, 300));

        // html2canvas at 3× for crisp PDF output
        const canvas = await html2canvas(container, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#f8f7f2',
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/png', 1.0);

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

        const cleanFilename = (str) =>
            str
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .substring(0, 30);

        const safeStudentName = cleanFilename(studentName) || 'Student';
        const safeCourseName = cleanFilename(cleanCourseName) || 'Certificate';
        const fileName = `${safeStudentName}_${safeCourseName}_Certificate.pdf`;

        doc.save(fileName);
        console.log(`Certificate PDF downloaded: ${fileName}`);
    } catch (error) {
        console.error('Error generating certificate PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    }
};

/**
 * Simple PDF download with minimal data — fallback
 */
export const downloadSimplePDF = (studentName, courseName) => {
    generateCertificatePDF({
        studentName: studentName || 'Student',
        courseName: courseName || 'Certificate',
    });
};

export default { generateCertificatePDF, downloadSimplePDF };
