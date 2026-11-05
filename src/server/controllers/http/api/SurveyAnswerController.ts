import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Body, JsonController, Post, Req } from 'routing-controllers';
import { SurveyAnswer } from '../../../../shared/app/models/index.js';
import { SURVEY_ANSWER_CREATE } from '../../../../shared/app/models/SurveyAnswer.js';
import { rateLimiterConsumeSurveyAnswer } from '../../../services/rate-limiters.js';

@JsonController()
@Service()
export default class SurveyAnswerController
{
    constructor(
        @Inject('Repository<SurveyAnswer>')
        private surveyAnswerRepository: Repository<SurveyAnswer>,
    ) {}

    @Post('/api/survey-answers')
    async postSurveyAnswer(
        @Req() request: Request,
        @Body({
            validate: { groups: [SURVEY_ANSWER_CREATE] },
            transform: { groups: [SURVEY_ANSWER_CREATE] },
        }) surveyAnswer: SurveyAnswer,
    ): Promise<void> {
        await rateLimiterConsumeSurveyAnswer(request.ip);

        await this.surveyAnswerRepository.save(surveyAnswer);
    }
}
