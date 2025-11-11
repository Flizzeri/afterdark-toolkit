#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';

const program = new Command();

program.name('adtk').description('Afterdark Toolkit CLI').version(version);

program.command('validate')
        .description('Run validation tools')
        .action(() => {
                console.log('Validation command');
        });

program.parse();
