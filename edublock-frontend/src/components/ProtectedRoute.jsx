import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
        // User not logged in, redirect to login page
        return <Navigate to="/login" replace />;
    }

    try {
        const user = JSON.parse(storedUser);
        const userRole = user.role?.toLowerCase() || '';

        // If specific roles are required, check permissions
        if (allowedRoles && allowedRoles.length > 0) {
            const hasRole = allowedRoles.some(role => role.toLowerCase() === userRole);
            if (!hasRole) {
                // Not authorized for this page, redirect to their own home dashboard
                if (userRole === 'superadmin') {
                    return <Navigate to="/superadmin" replace />;
                } else if (userRole === 'admin') {
                    return <Navigate to="/admin" replace />;
                } else if (userRole === 'student') {
                    return <Navigate to="/student" replace />;
                } else {
                    return <Navigate to="/login" replace />;
                }
            }
        }
    } catch (e) {
        // Parsing error, clean up storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
    }

    // Fully authorized, render target component
    return children;
};

export default ProtectedRoute;
