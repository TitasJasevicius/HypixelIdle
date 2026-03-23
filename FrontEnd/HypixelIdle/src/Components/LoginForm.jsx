import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const decodeJwtPayload = (token) => {
    try {
        const tokenParts = token.split('.');

        if (tokenParts.length < 2) {
            return null;
        }

        const base64Url = tokenParts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const decodedPayload = atob(paddedBase64);

        return JSON.parse(decodedPayload);
    } catch {
        return null;
    }
};

const getPlayerIdFromAccessToken = (accessToken) => {
    const payload = decodeJwtPayload(accessToken);

    if (!payload) {
        return null;
    }

    // Supports .NET NameIdentifier plus common JWT aliases.
    return (
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
        ?? payload.nameid
        ?? payload.sub
        ?? null
    );
};

const LoginForm = ({ onToggle, classPrefix = 'auth' }) => {
    const navigate = useNavigate();
    const [loginForm, setLoginForm] = useState({
        username: '',
        password: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setLoginForm(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const isFormValid = () => {
        return (
            loginForm.username &&
            loginForm.password &&
            loginForm.password.length >= 6
        );
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!loginForm.username || !loginForm.password) {
            return;
        }
        if(loginForm.password.length < 6) {
            return;
        }

        try {
            const response = await axios.post('http://localhost:5091/api/auth/Login', {
                username: loginForm.username,
                password: loginForm.password
            });

            if (response.status === 200) {
                const accessToken = response.data?.accessToken ?? response.data?.AccessToken;
                const accessTokenExpiresAtUtc = response.data?.accessTokenExpiresAtUtc ?? response.data?.AccessTokenExpiresAtUtc;

                if (!accessToken || !accessTokenExpiresAtUtc) {
                    alert("Login response is missing token data.");
                    return;
                }

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('accessTokenExpiresAtUtc', accessTokenExpiresAtUtc);

                const playerId = getPlayerIdFromAccessToken(accessToken);
                if (playerId) {
                    localStorage.setItem('playerId', String(playerId));
                }

                window.dispatchEvent(new Event('auth-changed'));

                alert("Login successful!");
                navigate('/');
            }
        } catch (error) {
            console.error("Error during login:", error);
            alert("Login failed. Please check your credentials.");
        }
    };

    return (
        <>
            <h2>Login</h2>
            <form className={`${classPrefix}-form`} onSubmit={handleLogin}>
                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={loginForm.username}
                    onChange={handleInputChange}
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={handleInputChange}
                />
                <div className={`${classPrefix}-field-error-messages`}>
                    {loginForm.password && loginForm.password.length < 6 && (
                        <span className={`${classPrefix}-field-error-message-text`}>Password must be at least 6 characters long.</span>
                    )}
                    {(!loginForm.username || !loginForm.password) && (
                        <span className={`${classPrefix}-field-error-message-text`}>All fields are required.</span>
                    )}
                </div>
                <button type="submit" disabled={!isFormValid()}>Login</button>
                <span className={`${classPrefix}-toggle-link`}>
                    Don't have an account? <a onClick={onToggle}>Register here</a>
                </span>
            </form>
        </>
    );
};

export default LoginForm;
