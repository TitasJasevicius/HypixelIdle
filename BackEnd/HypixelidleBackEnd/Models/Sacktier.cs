using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Sacktier
{
    public int CapacityPerItem { get; set; }

    public int Tier { get; set; }

    public int IdSackTiers { get; set; }

    public int FkSackTypesidSackTypes { get; set; }

    public virtual Sacktype FkSackTypesidSackTypesNavigation { get; set; } = null!;

    public virtual Tier TierNavigation { get; set; } = null!;
}
