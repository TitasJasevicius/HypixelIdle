using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Gardenplant
{
    public string Name { get; set; } = null!;

    public int BaseGrowthTime { get; set; }

    public int BaseYield { get; set; }

    public float XpPerHarvest { get; set; }

    public string? Category { get; set; }

    public int IdGardenPlants { get; set; }

    public int FkPlayerGardenPlotsidPlayerGardenPlots { get; set; }

    public virtual Playergardenplot FkPlayerGardenPlotsidPlayerGardenPlotsNavigation { get; set; } = null!;
}
