using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Skillcategory
{
    public int IdSkillCategories { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<Skill> Skills { get; set; } = new List<Skill>();
}
