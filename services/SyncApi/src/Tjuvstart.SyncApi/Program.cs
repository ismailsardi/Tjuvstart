using Tjuvstart.SyncApi.Hosting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSyncApi(builder.Configuration);

var app = builder.Build();

app.UseSyncApi();

app.Run();
