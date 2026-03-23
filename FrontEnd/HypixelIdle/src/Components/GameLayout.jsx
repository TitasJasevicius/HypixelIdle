import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Outlet } from 'react-router-dom';
import SidebarMenu from './SidebarMenu';
import '../Styles/GlobalStyles.css';
import '../Styles/HomeStyles.css';

const GameLayout = () => {
    const [skills, setSkills] = useState([]);
    const [isLoadingSkills, setIsLoadingSkills] = useState(true);
    const [skillsError, setSkillsError] = useState('');

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                setIsLoadingSkills(true);
                setSkillsError('');

                const response = await axios.get('http://localhost:5091/api/Skills/GetSkills', {
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

        const buildUniqueSkills = (dynamicSkills) => {
            const seenLabels = new Set([miningMenuItem.label.toLowerCase()]);
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

            return [miningMenuItem, ...uniqueDynamicSkills];
        };

        if (isLoadingSkills) {
            return [miningMenuItem, { id: 'skills-loading', label: 'Loading skills...' }];
        }

        if (skillsError) {
            return [miningMenuItem, { id: 'skills-error', label: 'Unable to load skills' }];
        }

        if (skills.length === 0) {
            return [miningMenuItem, { id: 'skills-empty', label: 'No skills available' }];
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
                id: 'training',
                label: 'Training',
                children: [
                    { id: 'training-combat', label: 'Combat Drills' },
                    { id: 'training-foraging', label: 'Foraging Route' },
                ],
            },
            {
                id: 'bank',
                label: 'Bank',
                children: [
                    { id: 'bank-purse', label: 'Purse' },
                    { id: 'bank-storage', label: 'Storage' },
                ],
            },
        ],
        [skillsChildren]
    );

    return (
        <div className="home-page">
            <SidebarMenu title="Hypixel Idle" menuItems={menuTree} />
            <main className="home-content">
                <Outlet />
            </main>
        </div>
    );
};

export default GameLayout;
