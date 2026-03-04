using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Gardenlevel
{
    public int MaxLevels { get; set; }

    public float? BonusGrowthRate { get; set; }

    public float? BonusYieldRate { get; set; }

    public int IdGardenLevels { get; set; }
}
