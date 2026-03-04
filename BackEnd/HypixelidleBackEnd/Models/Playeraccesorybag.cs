using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playeraccesorybag
{
    public int UnlockedSlots { get; set; }

    public int MagicPower { get; set; }

    public int IdPlayerAccesoryBag { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public virtual ICollection<Accessorybagslot> Accessorybagslots { get; set; } = new List<Accessorybagslot>();

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;
}
