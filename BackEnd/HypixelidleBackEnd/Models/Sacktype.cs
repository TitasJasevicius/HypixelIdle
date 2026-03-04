using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Sacktype
{
    public string Name { get; set; } = null!;

    public string Description { get; set; } = null!;

    public int IdSackTypes { get; set; }

    public virtual ICollection<Playersack> Playersacks { get; set; } = new List<Playersack>();

    public virtual ICollection<Sacktier> Sacktiers { get; set; } = new List<Sacktier>();

    public virtual ICollection<Sacktypealloweditem> Sacktypealloweditems { get; set; } = new List<Sacktypealloweditem>();
}
