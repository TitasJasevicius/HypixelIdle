using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Mob
{
    public string Name { get; set; } = null!;

    public string MobType { get; set; } = null!;

    public int BaseHealth { get; set; }

    public int BaseDamage { get; set; }

    public int CoinsOnDeath { get; set; }

    public int ExpOrbs { get; set; }

    public float? SkillXpAmount { get; set; }

    public string? Location { get; set; }

    public string? Icon { get; set; }

    public int? SkillXpType { get; set; }

    public int IdMob { get; set; }

    public virtual Bestiary? Bestiary { get; set; }

    public virtual ICollection<Entitystat> Entitystats { get; set; } = new List<Entitystat>();

    public virtual ICollection<Mobinstance> Mobinstances { get; set; } = new List<Mobinstance>();

    public virtual Seacreaturemob? Seacreaturemob { get; set; }

    public virtual Skillxptype? SkillXpTypeNavigation { get; set; }

    public virtual ICollection<Mobdroptable> FkMobDropTableidMobDropTables { get; set; } = new List<Mobdroptable>();
}
