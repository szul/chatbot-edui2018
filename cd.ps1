Get-ChildItem **/*.chat | ForEach-Object { chatdown "$(Split-Path $_.FullName)/$($_.Name )" >  "$(Split-Path $_.FullName)/$($_.BaseName).transcript" }
