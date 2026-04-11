using System.Text;
using HypixelidleBackEnd.Authentication;
using HypixelidleBackEnd.Controllers;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Primitives;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("CORSPolicy", builder =>
    {
        //builder.AllowAnyMethod().AllowAnyHeader().WithOrigins("http://localhost:3000", "https://appname.azurestaticapps.net");
        builder.AllowAnyMethod()
               .AllowAnyHeader()
               .AllowAnyOrigin(); // Allow all origins
    });
});

builder.Services.AddDbContext<HypixelIdleContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    )
);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpClient();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Use: Bearer {token}"
    });

    options.AddSecurityDefinition("AdminKey", new OpenApiSecurityScheme
    {
        Name = AdminKeyAuthenticationHandler.AdminKeyHeaderName,
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Optional admin bypass key for protected endpoints"
    });

    // Add as separate requirement objects so either Bearer OR AdminKey can authorize requests.
    options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", null, null),
            new List<string>()
        }
    });

    options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("AdminKey", null, null),
            new List<string>()
        }
    });
});
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("JWT signing key is missing. Configure Jwt:Key in appsettings.");
}

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = "DynamicAuth";
        options.DefaultChallengeScheme = "DynamicAuth";
    })
    .AddPolicyScheme("DynamicAuth", "JWT or Admin Key", options =>
    {
        options.ForwardDefaultSelector = context =>
        {
            if (context.Request.Headers.TryGetValue("Authorization", out StringValues authorization)
                && !StringValues.IsNullOrEmpty(authorization)
                && authorization.Any(value => !string.IsNullOrWhiteSpace(value) && value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)))
            {
                return JwtBearerDefaults.AuthenticationScheme;
            }

            if (context.Request.Headers.TryGetValue(AdminKeyAuthenticationHandler.AdminKeyHeaderName, out var adminKey)
                && !string.IsNullOrWhiteSpace(adminKey))
            {
                return AdminKeyAuthenticationHandler.SchemeName;
            }

            return JwtBearerDefaults.AuthenticationScheme;
        };
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    })
    .AddScheme<AuthenticationSchemeOptions, AdminKeyAuthenticationHandler>(
        AdminKeyAuthenticationHandler.SchemeName,
        _ => { });

builder.Services.AddAuthorization();

// Builder services
builder.Services.AddScoped<HashingService>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<PlayerInitialization>();

// Builder controllers
builder.Services.AddScoped<InventoryController>();
builder.Services.AddScoped<StatsController>();
builder.Services.AddScoped<PlayerSkillsController>();
builder.Services.AddScoped<PurseController>();
builder.Services.AddScoped<BankController>();
builder.Services.AddScoped<NodeController>();


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CORSPolicy");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();


app.Run();

