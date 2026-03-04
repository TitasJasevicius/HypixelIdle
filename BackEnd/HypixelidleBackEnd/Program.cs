using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;

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
builder.Services.AddSwaggerGen();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

//Services

builder.Services.AddScoped<HashingService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CORSPolicy");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();


app.Run();

