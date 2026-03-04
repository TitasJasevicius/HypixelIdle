using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Bestiarytier
{
    public string Name { get; set; } = null!;

    public int RequiredKills { get; set; }

    public int RewardSkyblockXp { get; set; }

    public float? RewardXp { get; set; }

    public int IdBestiaryTiers { get; set; }

    public int FkBestiaryidBestiary { get; set; }

    public int Tier { get; set; }

    public virtual Bestiary FkBestiaryidBestiaryNavigation { get; set; } = null!;
}
