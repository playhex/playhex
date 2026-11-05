import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Expose } from '../class-transformer-custom.js';

export const SURVEY_ANSWER_CREATE = 'survey_answer:create';

/**
 * Anonymous answer to the survey displayed on lobby:
 * what visitors miss the most on PlayHex.
 */
@Entity()
export default class SurveyAnswer
{
    @PrimaryGeneratedColumn()
    id?: number;

    @Expose({ groups: [SURVEY_ANSWER_CREATE] })
    @IsString({ groups: [SURVEY_ANSWER_CREATE] })
    @IsNotEmpty({ groups: [SURVEY_ANSWER_CREATE] })
    @MaxLength(1000, { groups: [SURVEY_ANSWER_CREATE] })
    @Column({ type: 'text' })
    text: string;
}
