using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playerstorageslot
{
    public int SlotIndex { get; set; }

    public int Quantity { get; set; }

    public int IdPlayerStorageSlots { get; set; }

    public int FkPlayerStoragePagesidPlayerStoragePages { get; set; }

    public virtual Playerstoragepage FkPlayerStoragePagesidPlayerStoragePagesNavigation { get; set; } = null!;

    public virtual Iteminstance? Iteminstance { get; set; }
}
