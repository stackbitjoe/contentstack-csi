import * as React from 'react';
import classNames from 'classnames';
import { iconMap } from '../../svgs';
import Link from '../Link';

export default function Action(props) {
    const { elementId, className, title, altText, url, showIcon, icon, iconPosition = 'right', style = 'primary' } = props;
    const IconComponent = icon ? iconMap[icon] : null;

    const type = props.__metadata?.modelName;

    return (
        <Link
            href={url}
            aria-title={altText}
            id={elementId}
            className={classNames(
                'sb-component',
                'sb-component-block',
                type === 'button' ? 'sb-component-button' : 'sb-component-link',
                {
                    'sb-component-button-primary': type === 'button' && style === 'primary',
                    'sb-component-button-secondary': type === 'button' && style === 'secondary',
                    'sb-component-link-primary': type === 'link' && style === 'primary',
                    'sb-component-link-secondary': type === 'link' && style === 'secondary'
                },
                className
            )}
        >
            {title && <span>{title}</span>}
            {showIcon && IconComponent && (
                <IconComponent
                    className={classNames('shrink-0', 'fill-current', 'w-[1.25em]', 'h-[1.25em]', {
                        'order-first': iconPosition === 'left',
                        'mr-[0.5em]': title && iconPosition === 'left',
                        'ml-[0.5em]': title && iconPosition === 'right'
                    })}
                />
            )}
        </Link>
    );
}
