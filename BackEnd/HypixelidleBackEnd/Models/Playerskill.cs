using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playerskill
{
    public int Level { get; set; }

    public float Xp { get; set; }

    public int IdPlayerSkills { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public int FkSkillsidSkills { get; set; }

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;

    public virtual Skill FkSkillsidSkillsNavigation { get; set; } = null!;
}
