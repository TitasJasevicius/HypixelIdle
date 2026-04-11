import { useMemo } from 'react';
import Collection from '../Components/Collection';
import { getPlayerId } from '../Components/CombatUtils';
import '../Styles/GlobalStyles.css';
import '../Styles/CollectionsStyles.css';

const Collections = () => {
	const playerId = useMemo(getPlayerId, []);

	return (
		<section className="collections-page">
			<header className="collections-page-header">
				<h1>Collections</h1>
				<p>Track every collection, inspect tier rewards, and see what is needed for the next unlock.</p>
			</header>

			<Collection playerId={playerId} />
		</section>
	);
};

export default Collections;
