using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Entitystat
{
    public int? Value { get; set; }

    public float? PercentageValue { get; set; }

    public int IdEntityStats { get; set; }

    public int? FkPlayeridPlayer { get; set; }

    public int FkStatsidStats { get; set; }

    public int? FkItemidItem { get; set; }

    public int? FkMobidMob { get; set; }

    public virtual Item? FkItemidItemNavigation { get; set; }

    public virtual Mob? FkMobidMobNavigation { get; set; }

    public virtual Player? FkPlayeridPlayerNavigation { get; set; }

    public virtual Stat FkStatsidStatsNavigation { get; set; } = null!;
}
