import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { Outlet, useLocation } from 'react-router-dom';
import SidebarMenu from './SidebarMenu';
import Purse from './Purse';
import ItemSearch from './ItemSearch';
import '../Styles/GlobalStyles.css';
import '../Styles/HomeStyles.css';

const GameLayout = () => {
    const [skills, setSkills] = useState([]);
    const [isLoadingSkills, setIsLoadingSkills] = useState(true);
    const [skillsError, setSkillsError] = useState('');
    const location = useLocation();

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                setIsLoadingSkills(true);
                setSkillsError('');

                const response = await axios.get(API_BASE + '/Skills/GetSkills', {
                    headers: {
                        Accept: 'application/json',
                    },
                });

                setSkills(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Failed to load skills:', error);
                setSkillsError('Failed to load skills from API.');
            } finally {
                setIsLoadingSkills(false);
            }
        };

        fetchSkills();
    }, []);

    const skillsChildren = useMemo(() => {
        const miningMenuItem = {
            id: 'skills-mining',
            label: 'Mining',
            to: '/mining',
        };

        const foragingMenuItem = {
            id: 'skills-foraging',
            label: 'Foraging',
            to: '/foraging',
        };

        const combatMenuItem = {
            id: 'skills-combat',
            label: 'Combat',
            to: '/combat',
        };

        const buildUniqueSkills = (dynamicSkills) => {
            const seenLabels = new Set([
                miningMenuItem.label.toLowerCase(),
                foragingMenuItem.label.toLowerCase(),
                combatMenuItem.label.toLowerCase(),
            ]);
            const uniqueDynamicSkills = [];

            for (const skill of dynamicSkills) {
                const label = (skill.name ?? `Skill #${skill.idSkills}`).trim();
                const normalizedLabel = label.toLowerCase();

                if (seenLabels.has(normalizedLabel)) {
                    continue;
                }

                seenLabels.add(normalizedLabel);
                uniqueDynamicSkills.push({
                    id: `skills-${skill.idSkills}`,
                    label,
                });
            }

            return [miningMenuItem, foragingMenuItem, combatMenuItem, ...uniqueDynamicSkills];
        };

        if (isLoadingSkills) {
            return [miningMenuItem, foragingMenuItem, combatMenuItem, { id: 'skills-loading', label: 'Loading skills...' }];
        }

        if (skillsError) {
            return [miningMenuItem, foragingMenuItem, combatMenuItem, { id: 'skills-error', label: 'Unable to load skills' }];
        }

        if (skills.length === 0) {
            return [miningMenuItem, foragingMenuItem, combatMenuItem, { id: 'skills-empty', label: 'No skills available' }];
        }

        return buildUniqueSkills(skills);
    }, [isLoadingSkills, skillsError, skills]);

    const menuTree = useMemo(
        () => [
            {
                id: 'skills',
                label: 'Skills',
                children: skillsChildren,
            },
            {
                id: 'gameplay',
                label: 'Crafting',
                children: [
                    { id: 'gameplay-crafting', label: 'Crafting Table', to: '/crafting' },
                ],
            },
            {
                id: 'progress',
                label: 'Progress',
                children: [
                    { id: 'progress-collections', label: 'Collections', to: '/collections' },
                    { id: 'progress-leaderboard', label: 'Leaderboard', to: '/leaderboard' },
                    { id: 'progress-contracts', label: 'Contracts', to: '/contracts' },
                ],
            },
            {
                id: 'skin-render',
                label: 'Skin Render',
                children: [
                    { id: 'training-skin-render', label: 'Skin Render', to: '/skin-render' },
                ],
            },
            {
                id: 'bank',
                label: 'Bank',
                children: [
                    { id: 'bank-page', label: 'Bank', to: '/bank' },
                ],
            },
        ],
        [skillsChildren]
    );

    const isBankRoute = location.pathname === '/bank';

    return (
        <div className="home-page">
            <SidebarMenu title="Hypixel Idle" menuItems={menuTree} />
            <main className="home-content">
                {!isBankRoute ? <Purse className="layout-purse" /> : null}
                <Outlet />
            </main>
            <ItemSearch />
        </div>
    );
};

export default GameLayout;
