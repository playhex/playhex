import {
    Expose as BaseExpose,
    plainToInstance as basePlainToInstance,
    instanceToPlain as baseInstanceToPlain,
    instanceToInstance as baseInstanceToInstance,
    ClassConstructor,
    ClassTransformOptions,
    ExposeOptions,
} from 'class-transformer';

export const GROUP_DEFAULT = '_default';

const defaultClassTransformOptions: ClassTransformOptions = {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
    exposeDefaultValues: true,
    enableCircularCheck: true,
    groups: [GROUP_DEFAULT],
};

export const defaultInstanceToPlainOptions: ClassTransformOptions = {
    ...defaultClassTransformOptions,
    excludeExtraneousValues: true,
};

export const defaultPlainToInstanceOptions: ClassTransformOptions = {
    ...defaultClassTransformOptions,
    excludeExtraneousValues: false,
};

/**
 * To use on class properties instead of base expose,
 * to allow Expose a property to only a single endpoint:
 *
 * @Expose() => same as base expose
 * @Expose({ groups: ['custom'] }) => expose only if 'custom' group is used (base expose will also expose if not group is used)
 * @Expose({ groups: [GROUP_DEFAULT, 'custom'] }) => same as base @Expose(['custom']), expose when no group is provided, or if custom is provided
 *
 * This implies GROUP_DEFAULT group is provided in base configuration.
 */
export const Expose = (options?: ExposeOptions) => BaseExpose({
    ...defaultInstanceToPlainOptions,
    ...options,
});

export const plainToInstance = <T, V>(cls: ClassConstructor<T>, plain: V, options?: ClassTransformOptions): T => basePlainToInstance(
    cls,
    plain,
    {
        ...defaultPlainToInstanceOptions,
        ...options,
    },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const instanceToPlain = <T>(object: T, options?: ClassTransformOptions): Record<string, any> => baseInstanceToPlain(
    object,
    {
        ...defaultInstanceToPlainOptions,
        ...options,
    },
);

export const instanceToInstance = <T>(object: T, options?: ClassTransformOptions): T => baseInstanceToInstance(
    object,
    {
        ...defaultClassTransformOptions,
        ...options,
    },
);
