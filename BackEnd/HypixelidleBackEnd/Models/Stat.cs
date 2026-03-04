using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Stat
{
    public string Name { get; set; } = null!;

    public string Category { get; set; } = null!;

    public string? Effect { get; set; }

    public int IdStats { get; set; }

    public virtual ICollection<Entitystat> Entitystats { get; set; } = new List<Entitystat>();

    public virtual Skill? Skill { get; set; }
}
