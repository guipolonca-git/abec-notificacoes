@echo off
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado.
    echo Baixe em https://python.org e marque "Add Python to PATH".
    pause
    exit /b 1
)

python -c "
import os, re, random

print('\n=== Configuracao do abecmed-watch ===\n')

cpf = input('CPF do associado (so numeros): ').strip()
cpf = re.sub(r'\D', '', cpf)
while len(cpf) != 11:
    print('  -> Precisa ter 11 digitos.')
    cpf = re.sub(r'\D', '', input('CPF do associado (so numeros): '))

topico = input('\nTopico do ntfy (deixe em branco para sortear): ').strip()
topico = re.sub(r'[^a-zA-Z0-9_-]', '', topico)
if not topico:
    sufixo = hex(random.getrandbits(32))[2:10]
    topico = f'abecmed-{sufixo}'
    print(f'  -> Sorteado: {topico}')

with open('config.ini', 'w', encoding='utf-8') as f:
    f.write('[abecmed]\n')
    f.write(f'cpf = {cpf}\n')
    f.write(f'topico = {topico}\n')
    f.write('intervalo_min = 7\n')
    f.write('intervalo_max = 12\n')

print(f'\nSalvo em config.ini')
print('\nPROXIMO PASSO — no app ntfy do celular:')
print(f'  toque no + e assine exatamente este topico:\n\n      {topico}\n')
"

echo.
pause
