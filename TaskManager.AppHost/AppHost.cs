var builder = DistributedApplication.CreateBuilder(args);

var sql = builder.AddSqlServer("sql")
    .AddDatabase("taskdb");

var backend = builder.AddProject<Projects.TaskManager_Backend>("backend")
    .WithReference(sql)
    .WaitFor(sql);

builder.Build().Run();
