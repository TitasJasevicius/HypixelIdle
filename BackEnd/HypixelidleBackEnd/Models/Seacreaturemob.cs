using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Seacreaturemob
{
    public int FishingRequirement { get; set; }

    public bool? DayMob { get; set; }

    public int Weight { get; set; }

    public string? SpawnMessage { get; set; }

    public int Rarity { get; set; }

    public int FishingType { get; set; }

    public int IdMob { get; set; }

    public virtual Fishingtype FishingTypeNavigation { get; set; } = null!;

    public virtual Mob IdMobNavigation { get; set; } = null!;

    public virtual Rarity RarityNavigation { get; set; } = null!;
}
