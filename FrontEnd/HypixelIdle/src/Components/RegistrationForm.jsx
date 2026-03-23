import { useState } from 'react';
import axios from 'axios';

const RegistrationForm = ({ onToggle, classPrefix = 'auth' }) => {
    const [userForm, setUserForm] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        email: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserForm(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const isFormValid = () => {
        return (
            userForm.username &&
            userForm.password &&
            userForm.email &&
            userForm.confirmPassword &&
            userForm.password.length >= 6 &&
            userForm.username.length >= 6 &&
            userForm.password === userForm.confirmPassword
        );
    };

    const handleRegistration = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post('http://localhost:5091/api/player/CreatePlayer', {
                username: userForm.username,
                password: userForm.password,
                email: userForm.email
            });

            if (response.status === 201) {
                alert("Registration successful!");
                onToggle(); 
            }
        } catch (error) {
            console.error("Error during registration:", error);
            alert("Registration failed. Please try again.");
        }
    };

    return (
        <>
            <h2>Register</h2>
            <form className={`${classPrefix}-form`} onSubmit={handleRegistration}>
                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={userForm.username}
                    onChange={handleInputChange}
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={userForm.password}
                    onChange={handleInputChange}
                />
                <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={userForm.confirmPassword}
                    onChange={handleInputChange}
                />
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={userForm.email}
                    onChange={handleInputChange}
                />
                <div className={`${classPrefix}-field-error-messages`}>
                    {userForm.password && userForm.password.length < 6 && (
                        <span className={`${classPrefix}-field-error-message-text`}>Password must be at least 6 characters long.</span>
                    )}
                    {userForm.username && userForm.username.length < 6 && (
                        <span className={`${classPrefix}-field-error-message-text`}>Username must be at least 6 characters long.</span>
                    )}
                    {userForm.password && userForm.confirmPassword && userForm.password !== userForm.confirmPassword && (
                        <span className={`${classPrefix}-field-error-message-text`}>Passwords do not match.</span>
                    )}
                    {(!userForm.username || !userForm.password || !userForm.email) && (
                        <span className={`${classPrefix}-field-error-message-text`}>All fields are required.</span>
                    )}
                </div>
                <button type="submit" disabled={!isFormValid()}>Register</button>
                <span className={`${classPrefix}-toggle-link`}>
                    Already have an account? <a onClick={onToggle}>Login here</a>
                </span>
            </form>
        </>
    );
};

export default RegistrationForm;
