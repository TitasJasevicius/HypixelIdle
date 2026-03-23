import { useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';
import '../Styles/AuthStyles.css'; 
import '../Styles/GlobalStyles.css';

const Auth = ({ initialMode = 'register' }) => {
    const [isLogin, setIsLogin] = useState(initialMode === 'login');

    useEffect(() => {
        setIsLogin(initialMode === 'login');
    }, [initialMode]);

    const toggleForm = () => {
        setIsLogin(!isLogin);
    };

    return (
        <div className="auth-page">
            <main className="auth-main">
                <section className="auth-glass">
                    {isLogin ? (
                        <LoginForm onToggle={toggleForm} />
                    ) : (
                        <RegistrationForm onToggle={toggleForm} />
                    )}
                </section>
            </main>
        </div>
    );
};

export default Auth;
