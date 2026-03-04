using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Skill
{
    public string? Name { get; set; }

    public int MaxLevel { get; set; }

    public string? PassiveAbility { get; set; }

    public float? BasePassiveAbilityValue { get; set; }

    public string? Description { get; set; }

    public int Category { get; set; }

    public int IdSkills { get; set; }

    public int FkStatsidStats { get; set; }

    public virtual Skillcategory CategoryNavigation { get; set; } = null!;

    public virtual Stat FkStatsidStatsNavigation { get; set; } = null!;

    public virtual ICollection<Playerskill> Playerskills { get; set; } = new List<Playerskill>();

    public virtual ICollection<Recipe> Recipes { get; set; } = new List<Recipe>();
}
