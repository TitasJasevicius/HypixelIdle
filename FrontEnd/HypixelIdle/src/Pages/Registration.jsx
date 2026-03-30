import RegistrationForm from '../Components/RegistrationForm';
import '../Styles/RegistrationStyles.css'; 
import '../Styles/GlobalStyles.css';

const Registration = () => {
    const handleToggle = () => {
        // do something later
        
    }; 

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