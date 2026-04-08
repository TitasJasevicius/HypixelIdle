using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playernodeunlock
{
    public int FkPlayeridPlayer { get; set; }

    public int FkNodeidNode { get; set; }

    public virtual Node FkNodeidNodeNavigation { get; set; } = null!;

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;
}