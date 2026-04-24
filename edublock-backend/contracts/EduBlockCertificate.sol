// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EduBlockCertificate
 * @dev Smart contract for issuing and verifying educational certificates on blockchain.
 *      Each certificate is stored as a unique record with its degree hash.
 */
contract EduBlockCertificate {

    // Contract owner (deployer - Super Admin)
    address public owner;

    // Degree Certificate structure
    struct Certificate {
        uint256 tokenId;
        bytes32 degreeHash;       // SHA-256 hash of degree data
        address issuedBy;         // Wallet that issued this certificate
        uint256 issuedAt;         // Timestamp of issuance
        bool isRevoked;           // Revocation status
    }

    // Storage mappings
    mapping(uint256 => Certificate) public certificates;      // tokenId => Certificate
    mapping(bytes32 => uint256) public hashToTokenId;          // degreeHash => tokenId
    mapping(bytes32 => bool) public hashExists;                // degreeHash => exists?

    // Counter for total certificates
    uint256 public totalCertificates;

    // Events
    event DegreeMinted(uint256 indexed tokenId, bytes32 degreeHash, address indexed issuedBy, uint256 timestamp);
    event DegreeRevoked(uint256 indexed tokenId, bytes32 degreeHash, address indexed revokedBy, uint256 timestamp);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Mint a new degree certificate on the blockchain.
     * @param _tokenId Unique ID for this certificate
     * @param _degreeHash SHA-256 hash of the degree data
     */
    function mintDegree(uint256 _tokenId, bytes32 _degreeHash) public onlyOwner {
        require(!hashExists[_degreeHash], "Degree with this hash already exists");
        require(certificates[_tokenId].issuedAt == 0, "Token ID already used");

        certificates[_tokenId] = Certificate({
            tokenId: _tokenId,
            degreeHash: _degreeHash,
            issuedBy: msg.sender,
            issuedAt: block.timestamp,
            isRevoked: false
        });

        hashToTokenId[_degreeHash] = _tokenId;
        hashExists[_degreeHash] = true;
        totalCertificates++;

        emit DegreeMinted(_tokenId, _degreeHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Revoke a degree certificate.
     * @param _tokenId The token ID of the certificate to revoke
     */
    function revokeDegree(uint256 _tokenId) public onlyOwner {
        require(certificates[_tokenId].issuedAt != 0, "Certificate does not exist");
        require(!certificates[_tokenId].isRevoked, "Certificate already revoked");

        certificates[_tokenId].isRevoked = true;

        emit DegreeRevoked(
            _tokenId,
            certificates[_tokenId].degreeHash,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Verify if a degree hash exists on blockchain and is not revoked.
     * @param _degreeHash The hash to verify
     * @return exists Whether the hash exists
     * @return isRevoked Whether the certificate is revoked
     * @return tokenId The token ID associated with this hash
     */
    function verifyDegree(bytes32 _degreeHash) public view returns (
        bool exists,
        bool isRevoked,
        uint256 tokenId
    ) {
        exists = hashExists[_degreeHash];
        if (exists) {
            tokenId = hashToTokenId[_degreeHash];
            isRevoked = certificates[tokenId].isRevoked;
        }
        return (exists, isRevoked, tokenId);
    }

    /**
     * @dev Get full details of a certificate by token ID.
     * @param _tokenId The token ID to look up
     */
    function getCertificate(uint256 _tokenId) public view returns (
        bytes32 degreeHash,
        address issuedBy,
        uint256 issuedAt,
        bool isRevoked
    ) {
        Certificate memory cert = certificates[_tokenId];
        require(cert.issuedAt != 0, "Certificate does not exist");
        return (cert.degreeHash, cert.issuedBy, cert.issuedAt, cert.isRevoked);
    }
}
