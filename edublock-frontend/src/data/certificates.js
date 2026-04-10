/**
 * Mock Certificate Database
 * This simulates a database of certificates that both the Student Dashboard
 * and Verification page can access.
 * 
 * In a real application, this would be fetched from a backend API.
 */

// All mock certificates in the system
export const mockCertificates = [
    {
        id: 1,
        studentName: 'Student User',
        courseName: 'Blockchain Development',
        institution: 'Tech University',
        grade: 'A+',
        issueDate: '2025-01-15',
        hash: '0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890',
        txHash: '0x7f8c9d2e1a3b4c5f6789abcdef012345678901234567890abcdef01234567890',
        status: 'Issued',
        txStatus: 'Confirmed',
    },
    {
        id: 2,
        studentName: 'Student User',
        courseName: 'Smart Contract Security',
        institution: 'Crypto Academy',
        grade: 'A',
        issueDate: '2024-12-10',
        hash: '0xefgh5678ij901234klmn5678opqr9012stuv3456wxyz7890abcd1234efgh5678',
        txHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
        status: 'Issued',
        txStatus: 'Confirmed',
    },
    {
        id: 3,
        studentName: 'Student User',
        courseName: 'Web3 Development',
        institution: 'Tech University',
        grade: 'A-',
        issueDate: '2024-11-20',
        hash: '0xijkl9012mnop3456qrst7890uvwx1234yz567890abcd1234efgh5678ijkl9012',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        status: 'Pending',
        txStatus: 'Pending',
    },
];

/**
 * Find a certificate by its hash
 * @param {string} hash - The certificate hash to search for
 * @returns {Object|null} - The certificate if found, null otherwise
 */
export const findCertificateByHash = (hash) => {
    if (!hash) return null;
    const normalizedHash = hash.toLowerCase().trim();
    return mockCertificates.find(cert =>
        cert.hash.toLowerCase() === normalizedHash
    ) || null;
};

/**
 * Get all certificates for a specific student (by name or email)
 * @param {string} studentName - Name of the student
 * @returns {Array} - Array of certificates
 */
export const getCertificatesForStudent = (studentName) => {
    if (!studentName) return mockCertificates;
    return mockCertificates.filter(cert =>
        cert.studentName.toLowerCase() === studentName.toLowerCase()
    );
};

/**
 * Verify a certificate hash
 * Returns verification result with proper status
 * @param {string} hash - The certificate hash to verify
 * @returns {Object} - Verification result
 */
export const verifyCertificate = (hash) => {
    // Check format first
    if (!hash || !hash.startsWith('0x') || hash.length < 10) {
        return {
            valid: false,
            errorType: 'invalid_format',
            message: 'Invalid certificate ID format. Certificate hash should start with "0x" and be at least 10 characters long.',
        };
    }

    // Find the certificate in our database
    const certificate = findCertificateByHash(hash);

    // Certificate not found
    if (!certificate) {
        return {
            valid: false,
            errorType: 'not_found',
            message: 'Certificate not found. This hash does not match any certificate in our blockchain records.',
        };
    }

    // Certificate is pending
    if (certificate.status === 'Pending' || certificate.txStatus === 'Pending') {
        return {
            valid: false,
            errorType: 'pending',
            message: 'This certificate transaction is pending confirmation on the blockchain.',
            details: 'Please check back in a few minutes.',
            certificate: certificate, // Include data for reference
        };
    }

    // Certificate is revoked (simulated by checking for 'Revoked' status)
    if (certificate.status === 'Revoked') {
        return {
            valid: false,
            errorType: 'revoked',
            message: 'This certificate has been revoked by the issuing institution.',
            revokeDate: certificate.revokeDate || 'Unknown',
            revokeReason: certificate.revokeReason || 'Contact institution for details',
        };
    }

    // Certificate is valid and issued
    return {
        valid: true,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        issueDate: certificate.issueDate,
        institution: certificate.institution,
        grade: certificate.grade,
        hash: certificate.hash,
        txHash: certificate.txHash,
        status: certificate.status,
    };
};

export default {
    mockCertificates,
    findCertificateByHash,
    getCertificatesForStudent,
    verifyCertificate,
};
