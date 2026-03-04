using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playerstoragepage
{
    public int PageNumber { get; set; }

    public int IdPlayerStoragePages { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;

    public virtual ICollection<Playerstorageslot> Playerstorageslots { get; set; } = new List<Playerstorageslot>();
}
