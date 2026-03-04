using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Fishingtype
{
    public int IdFishingTypes { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<Seacreaturemob> Seacreaturemobs { get; set; } = new List<Seacreaturemob>();
}
