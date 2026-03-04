import { useState } from 'react';
import axios from 'axios';

const LoginForm = ({ onToggle, classPrefix = 'auth' }) => {
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
            const response = await axios.post('http://localhost:5091/api/player/Login', {
                username: loginForm.username,
                password: loginForm.password
            });

            if (response.status === 200) {
                alert("Login successful!");
                // navigate to home/game page
                // navigate('/home');
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
