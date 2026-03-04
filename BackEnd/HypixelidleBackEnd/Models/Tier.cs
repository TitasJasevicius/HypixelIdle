using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Tier
{
    public int IdTier { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<Sacktier> Sacktiers { get; set; } = new List<Sacktier>();
}
