using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playergardenplot
{
    public DateTime PlantDate { get; set; }

    public DateTime? LastHarvestedDate { get; set; }

    public int IdPlayerGardenPlots { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;

    public virtual ICollection<Gardenplant> Gardenplants { get; set; } = new List<Gardenplant>();
}
