import RegistrationForm from '../Components/RegistrationForm';
import '../Styles/RegistrationStyles.css'; 
import '../Styles/GlobalStyles.css';

const Registration = () => {
    /*const handleToggle = () => {
        // Navigate to login or handle toggle if needed
        console.log("Toggle to login");
    }; */

    return (
        <div className="registration-page">
            <main className="registration-main">
                <section className="registration-glass">
                    <RegistrationForm onToggle={handleToggle} classPrefix="registration" />
                </section>
            </main>
        </div>
    )
}

export default Registration;