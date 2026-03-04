using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Mobinstance
{
    public int CurrentHealth { get; set; }

    public DateTime SpawnedDate { get; set; }

    public DateTime? LastUpdate { get; set; }

    public int IdMobInstance { get; set; }

    public int FkMobidMob { get; set; }

    public virtual Mob FkMobidMobNavigation { get; set; } = null!;
}
