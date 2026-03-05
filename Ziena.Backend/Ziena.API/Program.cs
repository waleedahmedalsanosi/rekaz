using Ziena.Infrastructure.Extensions;
using Ziena.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        // Explicit camelCase — matches the React frontend's naming convention.
        // e.g. AvailableBalance → availableBalance, MerchantId → merchantId
        options.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase);

builder.Services.AddOpenApi();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.MapControllers();

// Ensure DB exists and seed reference data in development
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ZienaDbContext>();
    DbInitializer.Initialize(db);
}

app.Run();
