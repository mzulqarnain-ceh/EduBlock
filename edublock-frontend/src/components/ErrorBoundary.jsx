import React from 'react';
import Button from './Button';
import Card from './Card';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <Card className="max-w-lg w-full text-center">
                        <div className="text-6xl mb-6">⚠️</div>
                        <h1 className="text-2xl font-bold mb-4 text-red-400">
                            Oops! Something Went Wrong
                        </h1>
                        <p className="text-white/60 mb-6">
                            An unexpected error occurred. Don't worry, your data is safe.
                            Please try refreshing the page.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-left">
                                <p className="text-red-400 font-mono text-sm break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center">
                            <Button variant="primary" onClick={this.handleReload}>
                                🔄 Refresh Page
                            </Button>
                            <Button variant="secondary" onClick={this.handleGoHome}>
                                🏠 Go Home
                            </Button>
                        </div>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
