with open(r"e:\fyp\antigravity\EduBlock\edublock-frontend\src\pages\SuperAdminDashboard.jsx", "rb") as f:
    lines = f.readlines()

for i in range(518, 529):
    print(f"{i+1}: {repr(lines[i])}")
