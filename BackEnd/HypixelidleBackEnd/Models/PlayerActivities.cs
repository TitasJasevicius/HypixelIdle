using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class PlayerActivities
{
    public int IdPlayerActivities { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<Playeractivity> Playeractivities { get; set; } = new List<Playeractivity>();
}
