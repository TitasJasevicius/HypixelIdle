using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Accessorybagslot
{
    public int SlotIndex { get; set; }

    public int IdAccessoryBagSlots { get; set; }

    public int FkPlayerAccesoryBagidPlayerAccesoryBag { get; set; }

    public virtual Playeraccesorybag FkPlayerAccesoryBagidPlayerAccesoryBagNavigation { get; set; } = null!;

    public virtual Iteminstance? Iteminstance { get; set; }
}
