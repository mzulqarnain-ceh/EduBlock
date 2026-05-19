import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { openTransactionInExplorer } from '../utils/blockchain';
import { generateCertificatePDF } from '../utils/pdfGenerator';
import { verifyAPI } from '../services/api';

const extractCleanHash = (decodedText) => {
    if (!decodedText) return '';
    
    // 1. Try to find a query parameter: ?hash=0x... or ?id=...
    const hashMatch = decodedText.match(/hash=([a-fA-F0-9x]+)/i);
    if (hashMatch) return hashMatch[1];
    
    const idMatch = decodedText.match(/id=(\d+)/i);
    if (idMatch) return idMatch[1];
    
    // 2. If it's a URL ending with a slash and the token ID or transaction hash
    // Example: https://edublock.com/verify/0xabc... or https://edublock.com/verify/123
    try {
        if (decodedText.includes('/verify/')) {
            const parts = decodedText.split('/verify/');
            const lastPart = parts[parts.length - 1].split('?')[0].split('#')[0];
            if (lastPart) return lastPart.trim();
        }
    } catch (e) {
        console.error("Error parsing verify path", e);
    }
    
    // 3. Fallback: If it starts with http/https, parse the last path segment
    if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        try {
            const urlObj = new URL(decodedText);
            const pathParts = urlObj.pathname.split('/');
            const lastSegment = pathParts[pathParts.length - 1];
            if (lastSegment) return lastSegment.trim();
        } catch (e) {
            const parts = decodedText.split('/');
            return parts[parts.length - 1].trim();
        }
    }
    
    return decodedText.trim();
};

const Verification = () => {
    const [certificateId, setCertificateId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [scannerInstance, setScannerInstance] = useState(null);
    const [shareCopied, setShareCopied] = useState(false);
    const inputRef = useRef(null);

    const performVerification = async (inputVal) => {
        const input = inputVal.trim();
        
        // Reset error state
        setError('');
        
        if (!input) {
            setResult(null);
            setError('Please enter a certificate ID');
            return;
        }

        // 1. Character whitelist check (blocks single quotes, semicolons, angle brackets, equals, etc.)
        const safePattern = /^[a-zA-Z0-9\s\-_@./]{1,100}$/;
        if (!safePattern.test(input)) {
            setResult(null);
            setError('Invalid format. Only letters, numbers, spaces, and - _ @ . / are allowed (max 100 characters).');
            return;
        }

        // 2. Blacklisted SQL/Script injection keywords check
        const blacklistedKeywords = [
            'select', 'union', 'insert', 'update', 'delete', 'drop', 'alter', 
            'truncate', 'exec', 'script', '--', '/*', '*/', 'xp_cmdshell'
        ];
        const lowerInput = input.toLowerCase();
        if (blacklistedKeywords.some(keyword => lowerInput.includes(keyword))) {
            setResult(null);
            setError('Potentially malicious characters or keywords detected. Please enter a valid certificate ID.');
            return;
        }

        // 3. Format Enforce: Must be either numeric Token ID or Hex Hash (starting with 0x)
        const isTokenId = /^\d+$/.test(input);
        const isHash = /^0x[a-fA-F0-9]{40,66}$/i.test(input);

        if (!isTokenId && !isHash) {
            setResult(null);
            setError('For security and privacy, you must search using a valid Blockchain Hash (starting with 0x) or numeric Token ID. Registration numbers or Student IDs cannot be used.');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            // Call backend API for verification
            const requestData = {};

            // Determine if input is token ID or tx hash
            if (isTokenId) {
                requestData.token_id = parseInt(input);
            } else {
                requestData.tx_hash = input;
            }

            const response = await verifyAPI.verify(requestData);
            const data = response.data;

            if (data.verified && data.degree) {
                setResult({
                    valid: true,
                    studentName: data.degree.student_name,
                    courseName: data.degree.degree_name,
                    institution: data.degree.university_name || 'Unknown University',
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
            const errorMsg = err.response?.data?.detail || 'Network error. Please check your connection and try again.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = () => {
        performVerification(certificateId);
    };

    // Auto-focus the input field and check for URL hash parameter on page load
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }

        const params = new URLSearchParams(window.location.search);
        const hashParam = params.get('hash');
        if (hashParam) {
            setCertificateId(hashParam);
            performVerification(hashParam);
        }
    }, []);

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
                    const extractedHash = extractCleanHash(decodedText);
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const html5QrCode = new Html5Qrcode("hidden-qr-reader");
            const decodedText = await html5QrCode.scanFile(file, true);
            const extractedHash = extractCleanHash(decodedText);
            setCertificateId(extractedHash);
            setError('');
            html5QrCode.clear();
        } catch (err) {
            console.error(err);
            setError("Could not read QR code from image.");
        }
    };

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
                                    ref={inputRef}
                                    id="certificateId"
                                    type="text"
                                    value={certificateId}
                                    onChange={(e) => setCertificateId(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                                    placeholder="Enter certificate ID or hash (e.g., 0xabcd1234...)"
                                    className="input-field w-full"
                                    autoFocus
                                />
                                {error && (
                                    <p className="mt-2 text-red-400 text-sm">{error}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={handleVerify}
                                    disabled={loading}
                                    loading={loading}
                                    className="sm:col-span-3 shadow-lg shadow-amber-500/10"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        {loading ? 'Verifying...' : 'Verify Certificate'}
                                    </span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handleStartScanner}
                                    disabled={loading}
                                    className="sm:col-span-1 flex items-center justify-center gap-2 border-amber-500/50 hover:bg-amber-500/10"
                                >
                                    <span className="text-xl">📷</span>
                                    <span>Scan</span>
                                </Button>
                            </div>
                            <div id="hidden-qr-reader" style={{ display: 'none' }}></div>
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
                                                onClick={async () => await generateCertificatePDF({
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
                                                setTimeout(() => inputRef.current?.focus(), 100);
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
                                                setTimeout(() => inputRef.current?.focus(), 100);
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

                    {/* QR Scanner Modal */}
                    {showScanner && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="max-w-md w-full"
                            >
                                <Card className="border-amber-500/30 shadow-2xl shadow-amber-500/10 overflow-hidden">
                                    <div className="p-1">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                                    <span className="text-xl">📷</span>
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold">QR Scanner</h2>
                                                    <p className="text-white/40 text-xs">Scan or upload an image</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleStopScanner}
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all group"
                                            >
                                                <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Scanner Container */}
                                        <div className="relative rounded-2xl bg-black/40 border border-white/5 min-h-[280px] h-auto mb-6 group">
                                            <div id="qr-reader" className="w-full h-full"></div>
                                            
                                            {/* Scanner Overlay Decoration (Visible when active) */}
                                            <div className="absolute inset-0 pointer-events-none border-[2px] border-amber-500/20 rounded-2xl">
                                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-xl"></div>
                                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-xl"></div>
                                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-xl"></div>
                                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-xl"></div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Button
                                                variant="secondary"
                                                className="w-full py-4 border-white/10 hover:bg-white/10"
                                                onClick={handleStopScanner}
                                            >
                                                Close Scanner
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default Verification;
