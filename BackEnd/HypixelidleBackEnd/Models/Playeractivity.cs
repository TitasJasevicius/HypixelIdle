using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playeractivity
{
    public string TargetType { get; set; } = null!;

    public int TargetId { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime? LastProcessedAt { get; set; }

    public bool? IsActive { get; set; }

    public int ActivityType { get; set; }

    public int IdPlayerActivity { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public virtual PlayerActivities ActivityTypeNavigation { get; set; } = null!;

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;
}
