using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Recipe
{
    public string Name { get; set; } = null!;

    public int ResultQuantity { get; set; }

    public string GridJson { get; set; } = null!;

    public bool? IsEnabled { get; set; }

    public int? RequiresCollectionTier { get; set; }

    public int? RequiresSkillLevel { get; set; }

    public int IdRecipes { get; set; }

    public int? FkCollectionidCollection { get; set; }

    public int? FkSkillsidSkills { get; set; }

    public int FkItemidItem { get; set; }

    public virtual Collection? FkCollectionidCollectionNavigation { get; set; }

    public virtual Item FkItemidItemNavigation { get; set; } = null!;

    public virtual Skill? FkSkillsidSkillsNavigation { get; set; }
}
