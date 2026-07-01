USE [RetroGarage]
GO

IF COL_LENGTH('dbo.usuarios', 'otp_retro_secret') IS NULL
BEGIN
  ALTER TABLE [dbo].[usuarios]
  ADD [otp_retro_secret] [nvarchar](100) NULL
END
GO

IF COL_LENGTH('dbo.usuarios', 'otp_retro_habilitado') IS NULL
BEGIN
  ALTER TABLE [dbo].[usuarios]
  ADD [otp_retro_habilitado] [bit] NOT NULL
      CONSTRAINT [DF_usuarios_otp_retro_habilitado] DEFAULT ((0))
END
GO

