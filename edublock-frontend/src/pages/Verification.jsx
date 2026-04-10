import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { openTransactionInExplorer } from '../utils/blockchain';
import { generateCertificatePDF } from '../utils/pdfGenerator';
import { verifyAPI } from '../services/api';

const Verification = () => {
    const [certificateId, setCertificateId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [scannerInstance, setScannerInstance] = useState(null);
    const [shareCopied, setShareCopied] = useState(false);

    const handleVerify = async () => {
        if (!certificateId.trim()) {
            setError('Please enter a certificate ID');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            // Call backend API for verification
            const input = certificateId.trim();
            const requestData = {};

            // Determine if input is token ID, tx hash, or certificate ID
            if (/^\d+$/.test(input)) {
                requestData.token_id = parseInt(input);
            } else if (input.startsWith('0x')) {
                requestData.tx_hash = input;
            } else {
                requestData.certificate_id = input;
            }

            const response = await verifyAPI.verify(requestData);
            const data = response.data;

            if (data.verified && data.degree) {
                setResult({
                    valid: true,
                    studentName: data.degree.student_name,
                    courseName: data.degree.degree_name,
                    institution: 'EduBlock University',
                    grade: data.degree.grade || 'N/A',
                    issueDate: data.degree.issue_date,
                    hash: data.degree.blockchain_hash || '',
                    txHash: data.degree.tx_hash || '',
                    message: data.message,
                });
            } else if (data.status === 'revoked' && data.degree) {
                setResult({
                    valid: false,
                    errorType: 'revoked',
                    message: data.message,
                    revokeDate: data.degree.issue_date,
                    revokeReason: data.degree.revoke_reason || 'Not specified',
                });
            } else {
                setResult({
                    valid: false,
                    errorType: 'not_found',
                    message: data.message || 'No certificate found with the provided credentials.',
                });
            }
        } catch (err) {
            setError('Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStartScanner = () => {
        setShowScanner(true);
    };

    const handleStopScanner = () => {
        if (scannerInstance) {
            scannerInstance.clear().catch(err => console.error('Scanner clear error:', err));
            setScannerInstance(null);
        }
        setShowScanner(false);
    };

    useEffect(() => {
        if (showScanner && !scannerInstance) {
            const scanner = new Html5QrcodeScanner(
                'qr-reader',
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scanner.render(
                (decodedText) => {
                    // Extract hash from URL or use direct hash
                    const hashMatch = decodedText.match(/hash=([a-fA-F0-9x]+)/);
                    const extractedHash = hashMatch ? hashMatch[1] : decodedText;

                    setCertificateId(extractedHash);
                    handleStopScanner();
                },
                (errorMessage) => {
                    // Ignore scanning errors (continuous scanning)
                }
            );

            setScannerInstance(scanner);
        }

        return () => {
            if (scannerInstance) {
                scannerInstance.clear().catch(err => console.error('Cleanup error:', err));
            }
        };
    }, [showScanner]);

    return (
        <div className="min-h-screen pt-32 pb-20">
            <div className="container-custom">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl mx-auto"
                >
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold mb-4">
                            <span className="gradient-text">Verify</span> Certificate
                        </h1>
                        <p className="text-white/70 text-lg">
                            Enter the certificate ID to verify its authenticity on the blockchain
                        </p>
                    </div>

                    {/* Verification Form */}
                    <Card className="mb-8">
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="certificateId" className="block text-sm font-medium mb-2 text-white/80">
                                    Certificate ID
                                </label>
                                <input
                                    id="certificateId"
                                    type="text"
                                    value={certificateId}
                                    onChange={(e) => setCertificateId(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                                    placeholder="Enter certificate ID or hash (e.g., 0xabcd1234...)"
                                    className="input-field w-full"
                                />
                                {error && (
                                    <p className="mt-2 text-red-400 text-sm">{error}</p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={handleVerify}
                                    disabled={loading}
                                    loading={loading}
                                    className="flex-1"
                                >
                                    {loading ? 'Verifying...' : 'Verify Certificate'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handleStartScanner}
                                    disabled={loading}
                                    className="px-6"
                                >
                                    📷 Scan QR
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Verification Result */}
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Card className="relative overflow-hidden">
                                {/* Status Badge */}
                                <div className="absolute top-0 right-0 m-4">
                                    {result.valid ? (
                                        <div className="flex items-center gap-2 bg-green-500/20 border border-green-500 rounded-full px-4 py-2">
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-green-400 font-semibold">Verified</span>
                                        </div>
                                    ) : result.errorType === 'pending' ? (
                                        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500 rounded-full px-4 py-2">
                                            <svg className="w-5 h-5 text-amber-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-amber-400 font-semibold">Pending</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-red-500/20 border border-red-500 rounded-full px-4 py-2">
                                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            <span className="text-red-400 font-semibold">Invalid</span>
                                        </div>
                                    )}
                                </div>

                                {/* Certificate Details - Valid */}
                                {result.valid && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-8">
                                            <div className="text-6xl mb-4">🎓</div>
                                            <h2 className="text-3xl font-bold mb-2">{result.courseName}</h2>
                                            <p className="text-white/60">{result.institution}</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-white/60 text-sm mb-1">Student Name</p>
                                                <p className="text-lg font-semibold">{result.studentName}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-sm mb-1">Grade</p>
                                                <p className="text-lg font-semibold">{result.grade}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-sm mb-1">Issue Date</p>
                                                <p className="text-lg font-semibold">{result.issueDate}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-sm mb-1">Certificate Hash</p>
                                                <p className="text-sm font-mono break-all">{result.hash}</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <p className="text-white/60 text-sm mb-2">Transaction Hash</p>
                                            <div className="bg-black/30 rounded-lg p-4">
                                                <p className="text-sm font-mono break-all text-blue-400">{result.txHash}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => generateCertificatePDF({
                                                    studentName: result.studentName,
                                                    courseName: result.courseName,
                                                    institution: result.institution,
                                                    grade: result.grade,
                                                    issueDate: result.issueDate,
                                                    hash: result.hash,
                                                    txHash: result.txHash,
                                                    status: 'Issued'
                                                })}
                                            >
                                                📄 Download Certificate
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="flex-1"
                                                onClick={() => openTransactionInExplorer(result.txHash)}
                                            >
                                                🔗 View on Blockchain
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="flex-1"
                                                onClick={() => {
                                                    const url = `${window.location.origin}/verify?hash=${result.hash}`;
                                                    navigator.clipboard.writeText(url).then(() => {
                                                        setShareCopied(true);
                                                        setTimeout(() => setShareCopied(false), 2000);
                                                    });
                                                }}
                                            >
                                                {shareCopied ? '✅ Copied!' : '📤 Share Result'}
                                            </Button>
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="w-full mt-4"
                                            onClick={() => {
                                                setResult(null);
                                                setCertificateId('');
                                            }}
                                        >
                                            🔄 Verify Another Certificate
                                        </Button>
                                    </div>
                                )}

                                {/* Invalid Certificate States */}
                                {!result.valid && (
                                    <div className="space-y-6">
                                        <div className="text-center py-8">
                                            <div className="text-6xl mb-4">
                                                {result.errorType === 'revoked' && '🚫'}
                                                {result.errorType === 'expired' && '⏰'}
                                                {result.errorType === 'not_found' && '🔍'}
                                                {result.errorType === 'invalid_format' && '⚠️'}
                                                {result.errorType === 'pending' && '⏳'}
                                            </div>
                                            <h2 className={`text-2xl font-bold mb-2 ${result.errorType === 'pending' ? 'text-amber-400' : 'text-red-400'}`}>
                                                {result.errorType === 'revoked' && 'Certificate Revoked'}
                                                {result.errorType === 'expired' && 'Certificate Expired'}
                                                {result.errorType === 'not_found' && 'Certificate Not Found'}
                                                {result.errorType === 'invalid_format' && 'Invalid Format'}
                                                {result.errorType === 'pending' && 'Verification Pending'}
                                            </h2>
                                            <p className="text-white/60 max-w-md mx-auto">{result.message}</p>
                                        </div>

                                        {/* Show pending certificate details if available */}
                                        {result.errorType === 'pending' && result.certificate && (
                                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
                                                <h3 className="font-semibold text-amber-400">Certificate Details (Pending Confirmation)</h3>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-white/60">Course:</span>
                                                        <span className="ml-2">{result.certificate.courseName}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-white/60">Institution:</span>
                                                        <span className="ml-2">{result.certificate.institution}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-white/60">Grade:</span>
                                                        <span className="ml-2">{result.certificate.grade}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-white/60">Issue Date:</span>
                                                        <span className="ml-2">{result.certificate.issueDate}</span>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-amber-500/20">
                                                    <span className="text-white/60 text-xs">Transaction Hash (Pending):</span>
                                                    <p className="font-mono text-xs text-amber-400 break-all mt-1">
                                                        {result.certificate.txHash}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Additional Details for specific error types */}
                                        {result.errorType === 'revoked' && (
                                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-white/60">Revocation Date:</span>
                                                    <span className="text-red-400 font-semibold">{result.revokeDate}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-white/60">Reason:</span>
                                                    <span className="text-red-400">{result.revokeReason}</span>
                                                </div>
                                            </div>
                                        )}

                                        {result.errorType === 'expired' && (
                                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                                                <div className="flex justify-between">
                                                    <span className="text-white/60">Expiry Date:</span>
                                                    <span className="text-orange-400 font-semibold">{result.expiryDate}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggestions */}
                                        <div className="bg-white/5 rounded-lg p-4">
                                            <h3 className="font-semibold mb-2">💡 Suggestions:</h3>
                                            <ul className="text-white/60 text-sm space-y-1">
                                                {result.errorType === 'invalid_format' && (
                                                    <>
                                                        <li>• Make sure the certificate ID starts with "0x"</li>
                                                        <li>• Check if you copied the complete hash</li>
                                                        <li>• Try scanning the QR code instead</li>
                                                    </>
                                                )}
                                                {result.errorType === 'pending' && (
                                                    <>
                                                        <li>• Transaction is being mined on the blockchain</li>
                                                        <li>• This usually takes 1-5 minutes to complete</li>
                                                        <li>• Refresh this page or try again shortly</li>
                                                    </>
                                                )}
                                                {result.errorType === 'not_found' && (
                                                    <>
                                                        <li>• Double-check the certificate ID for typos</li>
                                                        <li>• Ensure you copied the complete hash</li>
                                                        <li>• The certificate may not exist in our records</li>
                                                        <li>• Contact the issuing institution for verification</li>
                                                    </>
                                                )}
                                                {result.errorType === 'revoked' && (
                                                    <>
                                                        <li>• Contact the issuing institution for clarification</li>
                                                        <li>• This certificate is no longer valid</li>
                                                    </>
                                                )}
                                                {result.errorType === 'expired' && (
                                                    <>
                                                        <li>• Contact the institution for renewal</li>
                                                        <li>• Some certifications require periodic renewal</li>
                                                    </>
                                                )}
                                            </ul>
                                        </div>

                                        <Button
                                            variant="secondary"
                                            className="w-full"
                                            onClick={() => {
                                                setResult(null);
                                                setCertificateId('');
                                            }}
                                        >
                                            🔄 Try Another Certificate
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    )}

                    {/* Info Section */}
                    {!result && (
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { icon: '⚡', title: 'Instant', desc: 'Results in seconds' },
                                { icon: '🔒', title: 'Secure', desc: 'Blockchain verified' },
                                { icon: '✓', title: 'Trusted', desc: 'Tamper-proof' },
                            ].map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                >
                                    <div className="text-center">
                                        <div className="text-4xl mb-3">{item.icon}</div>
                                        <h3 className="font-bold mb-1">{item.title}</h3>
                                        <p className="text-white/60 text-sm">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* QR Scanner Modal */}
                {showScanner && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md w-full"
                        >
                            <Card>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold">Scan QR Code</h2>
                                    <button
                                        onClick={handleStopScanner}
                                        className="text-white/60 hover:text-white"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <p className="text-white/60 text-sm mb-4">
                                    Position the QR code within the frame to scan
                                </p>

                                {/* Scanner Container */}
                                <div id="qr-reader" className="mb-4"></div>

                                <div className="text-center text-sm text-white/50">
                                    <p>📷 Allow camera access when prompted</p>
                                    <p className="mt-2">Hash will be auto-filled after scanning</p>
                                </div>

                                <Button
                                    variant="secondary"
                                    className="w-full mt-4"
                                    onClick={handleStopScanner}
                                >
                                    Cancel
                                </Button>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Verification;
